/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import type {Element} from './ElementsInspector.js';
import type {PluginClient} from '../../../plugin';
import type Logger from '../../../fb-stubs/Logger.js';
import Panel from '../Panel.js';
import ManagedDataInspector from '../data-inspector/ManagedDataInspector.js';
import {Component} from 'react';
import {Console} from '../console';
import {GK} from 'flipper';

const deepEqual = require('deep-equal');

type OnValueChanged = (path: Array<string>, val: any) => void;

type InspectorSidebarSectionProps = {
  data: any,
  id: string,
  onValueChanged: ?OnValueChanged,
  tooltips?: Object,
};

class InspectorSidebarSection extends Component<InspectorSidebarSectionProps> {
  setValue = (path: Array<string>, value: any) => {
    if (this.props.onValueChanged) {
      this.props.onValueChanged([this.props.id, ...path], value);
    }
  };

  shouldComponentUpdate(nextProps: InspectorSidebarSectionProps) {
    return (
      !deepEqual(nextProps, this.props) ||
      this.props.id !== nextProps.id ||
      this.props.onValueChanged !== nextProps.onValueChanged
    );
  }

  extractValue = (val: any, depth: number) => {
    if (val && val.__type__) {
      return {
        mutable: Boolean(val.__mutable__),
        type: val.__type__ === 'auto' ? typeof val.value : val.__type__,
        value: val.value,
      };
    } else {
      return {
        mutable: typeof val === 'object',
        type: typeof val,
        value: val,
      };
    }
  };

  render() {
    const {id} = this.props;
    return (
      <Panel heading={id} floating={false} grow={false}>
        <ManagedDataInspector
          data={this.props.data}
          setValue={this.props.onValueChanged ? this.setValue : undefined}
          extractValue={this.extractValue}
          expandRoot={true}
          collapsed={true}
          tooltips={this.props.tooltips}
        />
      </Panel>
    );
  }
}

type Props = {|
  element: ?Element,
  tooltips?: Object,
  onValueChanged: ?OnValueChanged,
  client: PluginClient,
  logger: Logger,
  extensions?: Array<any>,
|};

type State = {|
  isConsoleEnabled: boolean,
|};

export class InspectorSidebar extends Component<Props, State> {
  state = {
    isConsoleEnabled: false,
  };

  constructor(props: Props) {
    super(props);
    this.checkIfConsoleIsEnabled();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.client !== this.props.client) {
      this.checkIfConsoleIsEnabled();
    }
  }

  checkIfConsoleIsEnabled() {
    this.props.client
      .call('isConsoleEnabled')
      .then((result: {isEnabled: boolean}) => {
        this.setState({isConsoleEnabled: result.isEnabled});
      });
  }

  render() {
    const {element, extensions} = this.props;
    if (!element || !element.data) {
      return null;
    }

    const sections =
      (extensions &&
        extensions.map(ext =>
          ext(this.props.client, element.id, this.props.logger),
        )) ||
      [];

    for (const key in element.data) {
      sections.push(
        <InspectorSidebarSection
          tooltips={this.props.tooltips}
          key={key}
          id={key}
          data={element.data[key]}
          onValueChanged={this.props.onValueChanged}
        />,
      );
    }

    if (GK.get('sonar_show_console_plugin') && this.state.isConsoleEnabled) {
      sections.push(
        <Panel heading="JS Console" floating={false} grow={false}>
          <Console client={this.props.client} getContext={() => element.id} />
        </Panel>,
      );
    }

    return sections;
  }
}
